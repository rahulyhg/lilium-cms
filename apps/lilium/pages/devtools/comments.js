import { h, Component } from 'preact';
import API from '../../data/api';
import { TextField, ButtonWorker, CheckboxField } from '../../widgets/form';

export default class CommentDevTool extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };

        this.coldState = {};
    }

    fieldChanged(name, value) {
        this.coldState[name] = value;
    }

    createComment(done) {
        API.post('/devtools/createcomment/' + this.coldState.postid, {
            _id : this.coldState._id,
            text : this.coldState.text, 
            userid : this.coldState.userid,
            isThread : this.coldState.isThread
        }, (err, r) => {
            done();
        });
    }

    render() {
        return (
            <div id="comment-devtool">
                <h1>Comment</h1>
                <div style={{ padding : 15 }}>
                    <h2>Inject comment in article</h2>
                    <TextField     onChange={this.fieldChanged.bind(this)} name="text"     placeholder="Comment text" />
                    <TextField     onChange={this.fieldChanged.bind(this)} name="userid"   placeholder="User ID" />
                    <TextField     onChange={this.fieldChanged.bind(this)} name="_id"      placeholder="Post or Thread ID" />
                    <CheckboxField onChange={this.fieldChanged.bind(this)} name="isThread" placeholder="Reply to thread" />

                    <ButtonWorker  work={this.createComment.bind(this)}    text="Create comment" />
                </div>
            </div>
        )
    }
}