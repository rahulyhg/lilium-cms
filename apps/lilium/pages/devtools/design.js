import { h, Component } from 'preact';
import API from '../../data/api';
import { TextField, ButtonWorker, CheckboxField, MultiSelectBox, SelectField, StackBox, DatePicker, TopicPicker } from '../../widgets/form';
import { TextEditor } from '../../widgets/texteditor'
import { castNotification } from '../../layout/notifications';
import dateformat from 'dateformat';

const styles = {
    page : {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "calc(100vh - 50px)",
        bottom: 0,
        overflowY: 'scroll',
        width: "100%",
    },
    wrap800 : {
        maxWidth: 800, 
        margin: "auto"
    }
}

const BACKGROUNDS_IMAGES = [
    "https://images.unsplash.com/photo-1526725078729-d6b4c2b2a8b7?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=152de99ab92e1becf5026c01b7bf8f3f&auto=format&fit=crop&w=1920&q=80", 
    "https://images.unsplash.com/photo-1528979375023-c1e3916fe3c3?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=bc20ba6c43beda52e3d3f8d8fc5f068b&auto=format&fit=crop&h=1200&q=80",
    "https://images.unsplash.com/photo-1519109798364-ba17c14731df?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=7d84aa14276a5ba55f8cca9cb4ed8907&auto=format&fit=crop&w=1920&q=80", 
    "https://images.unsplash.com/photo-1531867758044-9a5ef1a7afef?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=7a0562cc7e508f7fdb27b0b9105c9d2d&auto=format&fit=crop&h=1080&q=80",
    "https://images.unsplash.com/photo-1495430599242-57ed65dd17b2?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=efb3ebd52e89f45a382e9ff17fb48cc0&auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1500150368783-cb8954285792?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=02d40d5e6537abf906b28e85b661fea2&auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1484494789010-20fc1a011197?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=fd01ec1c00af1598b6b39356c9f7e1d4&auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1524839454943-5ac121f65ccb?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=02c772a70a4e6e5d2a80b60f8fe2dfb0&auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1424169292451-7c28a6053189?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=8734cd3e54d66ae97e53a1b3c7984265&auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1526190462716-e604eab954b9?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=70ae7af8421aaa9bfe612e732d7c74c3&auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1518992212871-beba326cfffd?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=cc7d49649845bba72b7513a79253dca0&auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1497235332722-bc46e3a9d98a?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=b47ee6032febe6b4174b466f6c2a8376&auto=format&fit=crop&w=1920&q=80",
    "https://images.unsplash.com/photo-1467843182948-36a9b559865e?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=eab1d559f8fe9d409e10a51a9fec6cf1&auto=format&fit=crop&w=1920&q=80"
];

const MULTISELECTBOX_OPTIONS = [
    { displayName : "Coffee without sugar", value : "coffee-no-sugar" },
    { displayName : "Two million seagulls", value : "2m-seagulls" },
    { displayName : "A wild Pokemon fled", value : "wild-pkmn-fled" },
    { displayName : "Maybe have a seat?", value : "have-seat-maybe" },
    { displayName : "If only I had a plate", value : "if-had-plate" },
    { displayName : "Obsessed with taking a shower", value : "obsessed-taking-shower" },
    { displayName : "This puzzle is too big", value : "puzzle-too-big" },
    { displayName : "I downloaded 25Gb of ASMR", value : "dl-25gb-asmr" },
    { displayName : "There is no String.random() function", value : "no-string-random-ftc" },
    { displayName : "🍞🥖🥐🍞🥖🥐🍞🥖🥐🍞🥖🥐", value : "bread-everywhee" }
];

const SELECTBOX_OPTIONS = MULTISELECTBOX_OPTIONS.map(x => ({ displayname : x.displayName, value : x.value }));

export default class CommentDevTool extends Component {
    render() {
        return (
            <div class="graph-paper" style={{ paddingTop: 30, paddingBottom: 80 }}>
                <div style={styles.wrap800}>
                    <h2>Flex Cards</h2>
                    
                    <div style={{ display: 'flex', flexWrap : 'wrap' }}>
                        {
                            new Array(6).fill(true).map(x => (
                                <div class="card flex" style={{ width: 250 }}>
                                    <div class="image-wrapper">
                                        <img src={BACKGROUNDS_IMAGES[Math.floor(Math.random() * BACKGROUNDS_IMAGES.length)]} style={{ height: 200, objectFit : 'cover' }} />
                                    </div>
                                    <div class="detail-list">
                                        <div>Something : <b>something else</b></div>
                                        <div>Another thing : <b>definitely</b></div>
                                        <div>Stuff : <b>other stuff</b></div>
                                    </div>
                                    <footer>
                                        <span>Action</span>
                                        <span class="red">Dangerous</span>
                                    </footer>
                                </div>
                            ))
                        }
                    </div>

                    <h2 style={{ marginTop : 30 }}>Full Cards</h2>
                    <div>
                        {
                            ["green", "orange", "purple"].map(color => (
                                <div class="card">
                                    <div class="detail-head">
                                        <div class="bubble-wrap">
                                            <b>A great title with a {color} status bubble</b>
                                            <div class={"bubble " + color}>{color} color</div>
                                        </div>
                                    </div>
                                    <div class="detail-list">
                                        <div class="avatar-wrap" style={{ marginBottom: 12 }}>
                                            <img src={liliumcms.session.avatarURL} class="avatar" />
                                            <b class="avatar-name">{liliumcms.session.displayname}</b>
                                            <i>{dateformat(new Date(), 'dddd dd mmmm, yyyy')}</i>
                                        </div>
                
                                        <div>Something : <b>something else</b></div>
                                        <div>Another thing : <b>definitely</b></div>
                                        <div>Stuff : <b>other stuff</b></div>
                                    </div>
                                    <footer>
                                        <span>View</span>
                                        <span>Edit</span>
                                        <span class="red">Delete</span>
                                    </footer>
                                </div>
                            ))
                        }    
                    </div>

                    <h2 style={{ marginTop : 30 }}>Fields</h2>
                    <div>
                        <TextField placeholder="Some important value needed" onChange={(name, value) => castNotification({ title : "Text field changed with new value", message : value })} />
                        <CheckboxField placeholder="Would you like this?" onChange={(name, value) => castNotification({ title : "Checkbox changed", type : value ? "success" : "warning", message : value ? "Checked" : "Unchecked" })} />
                        <MultiSelectBox options={MULTISELECTBOX_OPTIONS} placeholder='Select a few things' onChange={(name, value) => {}} />
                        <SelectField options={SELECTBOX_OPTIONS} placeholder="Select one thing" onChange={(name, value) => castNotification({ title : "New value selected", message : value })} />
                        <StackBox placeholder="Create multiple things" onChange={(name, value) => castNotification({ title : "Stack box values count : " + value.length })} />
                        <DatePicker placeholder="Select your birthday" initialValue={new Date()} onChange={(name, value) => castNotification({ title : "Your birthday", message : dateformat(new Date(value), 'mmmm dd') })} />
                    </div>

                    <h2 style={{ marginTop : 30 }}>Text Editor</h2>
                    <TextEditor content="<p>Hello, <b>World!</b></p>" />

                    <h2 style={{ marginTop : 30 }}>Button Workers</h2>
                    <div class="card">
                        <div class="detail-head">
                            <b>Let's click on a few things</b>
                        </div>
                        <div class="detail-list">
                            <ButtonWorker theme="white" text="Work for 3 seconds" work={done => setTimeout(() => { done(); castNotification({ title : "Finished", message : "Task has completed", type : "success" }) }, 3000)} />
                            <ButtonWorker theme="red" text="Delete something" work={done => setTimeout(() => { done(); castNotification({ title : "Did not delete", message : "Could not delete a single thing", type : "error" }) }, 1000)} />
                            <ButtonWorker theme="blue" text="Save the world" sync={true} work={() => castNotification({ title : "Missing field", message : "Some imaginary fields are missing", type : "warning" }) } />
                            <ButtonWorker theme="green" text="Save the world again" sync={true} work={() => castNotification({ title : "Missing field", message : "Some imaginary fields are missing", type : "error" }) } />
                            <ButtonWorker theme="purple" text="Crash everything" sync={true} work={() => castNotification({ title : "Missing field", message : "Some imaginary fields are missing", type : "system" }) } />
                        </div>
                        <div class="detail-list">
                            <ButtonWorker type="fill" theme="white" text="Work for 3 seconds" work={done => setTimeout(() => { done(); castNotification({ title : "Finished", message : "Task has completed", type : "success" }) }, 3000)} />
                            <ButtonWorker type="fill" theme="red" text="Delete something" work={done => setTimeout(() => { done(); castNotification({ title : "Did not delete", message : "Could not delete a single thing", type : "error" }) }, 1000)} />
                            <ButtonWorker type="fill" theme="blue" text="Save the world" sync={true} work={() => castNotification({ title : "Missing field", message : "Some imaginary fields are missing", type : "warning" }) } />
                            <ButtonWorker type="fill" theme="green" text="Save the world again" sync={true} work={() => castNotification({ title : "Missing field", message : "Some imaginary fields are missing", type : "error" }) } />
                            <ButtonWorker type="fill" theme="purple" text="Crash everything" sync={true} work={() => castNotification({ title : "Missing field", message : "Some imaginary fields are missing", type : "system" }) } />
                        </div>
                        <footer>
                            <i>{dateformat(new Date(), 'dddd mmmm dd, yyyy')}</i>
                        </footer>
                    </div>
                    <div style={{  }}>
                        <ButtonWorker theme="white" text="A floating button" work={done => setTimeout(() => { done(); castNotification({ title : "Finished", message : "Task has completed", type : "success" }) }, 500)} />
                    </div>

                    <h2 style={{ marginTop : 30 }}>Fonts</h2>
                    <div>
                        {
                            ["main-font", "title-font", "subtitle-font", "monospace-font", "serif-font"].map(x => (
                                <div class={"card " + x}>
                                    <div class="detail-head">
                                        <h2>CSS class : .{x}</h2>
                                    </div>

                                    <div class="detail-list">
                                        <div style={{ fontSize: 72, borderBottom: "1px solid #ddd", paddingBottom: 10, marginBottom: 10 }}>72px : The quick brown fox jumps over the lazy dog</div>
                                        <div style={{ fontSize: 48, borderBottom: "1px solid #ddd", paddingBottom: 10, marginBottom: 10 }}>48px : The quick brown fox jumps over the lazy dog</div>
                                        <div style={{ fontSize: 32, borderBottom: "1px solid #ddd", paddingBottom: 10, marginBottom: 10 }}>32px : The quick brown fox jumps over the lazy dog</div>
                                        <div style={{ fontSize: 24, borderBottom: "1px solid #ddd", paddingBottom: 10, marginBottom: 10 }}>24px : The quick brown fox jumps over the lazy dog</div>
                                        <div style={{ fontSize: 18, borderBottom: "1px solid #ddd", paddingBottom: 10, marginBottom: 10 }}>18px : The quick brown fox jumps over the lazy dog</div>
                                        <div style={{ fontSize: 14, borderBottom: "1px solid #ddd", paddingBottom: 10, marginBottom: 10 }}>14px : The quick brown fox jumps over the lazy dog</div>
                                        <div style={{ fontSize: 10 }}>[10px] The quick brown fox jumps over the lazy dog</div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <h2 style={{ marginTop : 30 }}>Topic selection</h2>
                    <TopicPicker name="topic" placeholder="Choose a topic" onChange={(name, value) => castNotification({ title : "["+name+"] Topic selected : " + value.displayname })} />
                </div>
            </div>
        )
    }
}